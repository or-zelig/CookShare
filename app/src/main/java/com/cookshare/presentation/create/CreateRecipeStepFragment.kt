package com.cookshare.presentation.create

import android.os.Bundle
import android.view.View
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.navArgs
import com.cookshare.R
import com.cookshare.databinding.FragmentCreateRecipeStepBinding

class CreateRecipeStepFragment : Fragment(R.layout.fragment_create_recipe_step) {

    private var _binding: FragmentCreateRecipeStepBinding? = null
    private val binding get() = _binding!!

    private val viewModel: CreateRecipeStepViewModel by viewModels()
    private val args: CreateRecipeStepFragmentArgs by navArgs()

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        _binding = FragmentCreateRecipeStepBinding.bind(view)

        val stepNumber = args.stepNumber
        binding.stepTitle.text = getString(R.string.create_recipe_step_title, stepNumber)
        binding.stepDescription.text = getString(R.string.create_recipe_step_description, stepNumber)

        viewModel.trackStepViewed(stepNumber)
    }

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }
}
