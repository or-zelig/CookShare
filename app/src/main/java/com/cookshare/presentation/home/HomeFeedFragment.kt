package com.cookshare.presentation.home

import android.os.Bundle
import android.view.View
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import com.cookshare.R

class HomeFeedFragment : Fragment(R.layout.fragment_home_feed) {

    private val viewModel: HomeFeedViewModel by viewModels()

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
    }
}
